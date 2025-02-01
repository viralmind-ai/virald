import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { stringify as yamlDump } from 'yaml';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { VMProvider, VMConfig, VMInfo } from './base';

const execAsync = promisify(exec);

export class DockerProvider implements VMProvider {
    private docker: Docker;
    private vms: Map<string, VMInfo>;
    private basePort: number = 8006;
    private dataDir: string;

    constructor(dataDir: string = path.join(process.cwd(), 'vm-data')) {
        this.docker = new Docker();
        this.vms = new Map();
        this.dataDir = dataDir;
    }

    async isAvailable(): Promise<boolean> {
        try {
            await this.docker.ping();
            return true;
        } catch (error) {
            return false;
        }
    }

    private async ensureDataDir(): Promise<void> {
        await fs.mkdir(this.dataDir, { recursive: true });
    }

    private async generateComposeFile(vmId: string, config: VMConfig, port: number): Promise<string> {
        const composeConfig = {
            version: '3',
            services: {
                [vmId]: {
                    container_name: vmId,
                    image: 'qemux/qemu-docker',
                    environment: {
                        BOOT: config.isoUrl,
                        RAM_SIZE: config.memorySize || '1G',
                        CPU_CORES: config.cpuCores || '1',
                        DISK_SIZE: config.diskSize || '16G'
                    },
                    devices: [
                        '/dev/kvm',
                        '/dev/net/tun'
                    ],
                    cap_add: [
                        'NET_ADMIN'
                    ],
                    ports: [
                        `${port}:8006`
                    ],
                    volumes: [
                        `${path.join(this.dataDir, vmId)}:/storage`
                    ],
                    stop_grace_period: '2m'
                }
            }
        };

        const composePath = path.join(this.dataDir, `${vmId}-compose.yml`);
        const yamlContent = yamlDump(composeConfig);
        await fs.writeFile(composePath, yamlContent);
        return composePath;
    }

    async createVM(config: VMConfig): Promise<VMInfo> {
        await this.ensureDataDir();

        const vmId = `vm-${uuidv4().slice(0, 8)}`;
        const name = config.name || vmId;
        const port = this.basePort + this.vms.size;

        // Generate compose file
        const composePath = await this.generateComposeFile(vmId, config, port);

        // Start the container using docker compose
        await execAsync(`docker compose -f ${composePath} up -d`);

        // Create container reference
        const container = this.docker.getContainer(vmId);

        const vmInfo: VMInfo = {
            id: vmId,
            name,
            status: 'starting',
            port,
            config,
            connectionUrl: `http://localhost:${port}`
        };

        // Wait for container to be running
        try {
            const containerInfo = await container.inspect();
            vmInfo.status = containerInfo.State.Status;
        } catch (error) {
            console.error('Error inspecting container:', error);
        }

        this.vms.set(vmId, vmInfo);
        return vmInfo;
    }

    async stopVM(vmId: string): Promise<void> {
        const vm = this.vms.get(vmId);
        if (!vm) {
            throw new Error(`VM ${vmId} not found`);
        }

        const composePath = path.join(this.dataDir, `${vmId}-compose.yml`);
        await execAsync(`docker compose -f ${composePath} down`);
        
        vm.status = 'stopped';
        this.vms.set(vmId, vm);
    }

    async deleteVM(vmId: string): Promise<void> {
        await this.stopVM(vmId);
        
        // Clean up VM data
        const vmPath = path.join(this.dataDir, vmId);
        const composePath = path.join(this.dataDir, `${vmId}-compose.yml`);
        
        await fs.rm(vmPath, { recursive: true, force: true });
        await fs.rm(composePath, { force: true });
        
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
            const container = this.docker.getContainer(vmId);
            const info = await container.inspect();
            vm.status = info.State.Status;
            this.vms.set(vmId, vm);
            return vm.status;
        } catch (error) {
            console.error('Error getting VM status:', error);
            return 'unknown';
        }
    }
}
