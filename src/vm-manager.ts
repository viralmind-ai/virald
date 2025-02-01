import { VMProvider, VMConfig, VMInfo } from './providers/base';
import { DockerProvider } from './providers/docker';
import { UTMProvider } from './providers/utm';

export class VMManager {
    private providers: Map<string, VMProvider>;
    private activeProvider: VMProvider | null = null;

    constructor() {
        this.providers = new Map();
        this.setupProviders();
    }

    private async setupProviders(): Promise<void> {
        // Initialize providers
        const dockerProvider = new DockerProvider();
        const utmProvider = new UTMProvider();

        // Check availability and add providers
        if (await dockerProvider.isAvailable()) {
            this.providers.set('docker', dockerProvider);
        }
        if (await utmProvider.isAvailable()) {
            this.providers.set('utm', utmProvider);
        }

        // Set default provider (prefer UTM on macOS, fallback to Docker)
        if (this.providers.has('utm')) {
            this.activeProvider = this.providers.get('utm')!;
        } else if (this.providers.has('docker')) {
            this.activeProvider = this.providers.get('docker')!;
        }
    }

    public setProvider(name: string): void {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} not found or not available`);
        }
        this.activeProvider = provider;
    }

    public getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    private ensureProvider(): VMProvider {
        if (!this.activeProvider) {
            throw new Error('No VM provider available');
        }
        return this.activeProvider;
    }

    async createVM(config: VMConfig): Promise<VMInfo> {
        return this.ensureProvider().createVM(config);
    }

    async stopVM(vmId: string): Promise<void> {
        return this.ensureProvider().stopVM(vmId);
    }

    async deleteVM(vmId: string): Promise<void> {
        return this.ensureProvider().deleteVM(vmId);
    }

    getVM(vmId: string): VMInfo | undefined {
        return this.ensureProvider().getVM(vmId);
    }

    listVMs(): VMInfo[] {
        return this.ensureProvider().listVMs();
    }

    async getVMStatus(vmId: string): Promise<string> {
        return this.ensureProvider().getVMStatus(vmId);
    }
}
