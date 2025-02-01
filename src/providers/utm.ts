import { exec } from 'child_process';
import { promisify } from 'util';
import { VMProvider, VMConfig, VMInfo } from './base';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const UTMCTL_PATH = '/Applications/UTM.app/Contents/MacOS/utmctl';

export class UTMProvider implements VMProvider {
    private vms: Map<string, VMInfo>;
    private basePort: number = 5900; // Default VNC port for QEMU
    private utmctlPath: string | null = null;

    constructor() {
        this.vms = new Map();
    }

    async isAvailable(): Promise<boolean> {
        try {
            // First try PATH-based utmctl
            await execAsync('which utmctl');
            this.utmctlPath = 'utmctl';
            return true;
        } catch (error) {
            try {
                // Then try direct UTM.app path
                await fs.access(UTMCTL_PATH);
                this.utmctlPath = UTMCTL_PATH;
                return true;
            } catch (error) {
                return false;
            }
        }
    }

    private async ensureUtmctl(): Promise<string> {
        if (!this.utmctlPath) {
            // Try to find utmctl again
            if (await this.isAvailable()) {
                if (!this.utmctlPath) {
                    throw new Error('Failed to locate utmctl');
                }
            } else {
                throw new Error('UTM is not available');
            }
        }
        return this.utmctlPath;
    }

    private async parseVMList(): Promise<void> {
        const utmctl = await this.ensureUtmctl();
        const { stdout } = await execAsync(`"${utmctl}" list`);
        const lines = stdout.split('\n').filter(line => line.trim());
        
        // Clear existing VMs
        this.vms.clear();

        for (const line of lines) {
            // Example line: "Ubuntu (running) [5D419106-2824-4FED-BFE1-24A7F7E253D8]"
            const match = line.match(/^(.+?) \((.*?)\) \[(.*?)\]/);
            if (match) {
                const [, name, status, id] = match;
                const port = this.basePort + this.vms.size;
                
                const vmInfo: VMInfo = {
                    id,
                    name,
                    status,
                    port,
                    config: { isoUrl: '' }, // UTM doesn't expose this info via CLI
                    connectionUrl: `vnc://localhost:${port}`
                };
                
                this.vms.set(id, vmInfo);
            }
        }
    }

    async createVM(config: VMConfig): Promise<VMInfo> {
        const utmctl = await this.ensureUtmctl();
        
        // Create a new VM using UTM's CLI
        const { stdout } = await execAsync(
            `"${utmctl}" create --name "${config.name}" --arch "$(uname -m)" --memory "${config.memorySize || '1024"'} --disk-size "${config.diskSize || '16384"'} --iso "${config.isoUrl}"`
        );

        // Extract VM ID from creation output
        const idMatch = stdout.match(/\[(.*?)\]/);
        if (!idMatch) {
            throw new Error('Failed to create VM: Could not get VM ID');
        }

        const vmId = idMatch[1];
        const port = this.basePort + this.vms.size;

        const vmInfo: VMInfo = {
            id: vmId,
            name: config.name || vmId,
            status: 'stopped',
            port,
            config,
            connectionUrl: `vnc://localhost:${port}`
        };

        this.vms.set(vmId, vmInfo);
        return vmInfo;
    }

    async stopVM(vmId: string): Promise<void> {
        const vm = this.vms.get(vmId);
        if (!vm) {
            throw new Error(`VM ${vmId} not found`);
        }

        const utmctl = await this.ensureUtmctl();
        await execAsync(`"${utmctl}" stop "${vmId}"`);
        vm.status = 'stopped';
        this.vms.set(vmId, vm);
    }

    async deleteVM(vmId: string): Promise<void> {
        const vm = this.vms.get(vmId);
        if (!vm) {
            throw new Error(`VM ${vmId} not found`);
        }

        const utmctl = await this.ensureUtmctl();

        // Stop the VM if it's running
        if (vm.status === 'running') {
            await this.stopVM(vmId);
        }

        // Delete the VM
        await execAsync(`"${utmctl}" delete "${vmId}"`);
        this.vms.delete(vmId);
    }

    getVM(vmId: string): VMInfo | undefined {
        return this.vms.get(vmId);
    }

    listVMs(): VMInfo[] {
        return Array.from(this.vms.values());
    }

    async getVMStatus(vmId: string): Promise<string> {
        const vm = this.vms.get(vmId);
        if (!vm) {
            throw new Error(`VM ${vmId} not found`);
        }

        try {
            const utmctl = await this.ensureUtmctl();
            const { stdout } = await execAsync(`"${utmctl}" status "${vmId}"`);
            const status = stdout.trim();
            vm.status = status;
            this.vms.set(vmId, vm);
            return status;
        } catch (error) {
            console.error('Error getting VM status:', error);
            return 'unknown';
        }
    }
}
