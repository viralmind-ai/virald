export interface VMConfig {
    name?: string;
    memorySize?: string;
    cpuCores?: string;
    isoUrl: string;
    diskSize?: string;
}

export interface VMInfo {
    id: string;
    name: string;
    status: string;
    port: number;
    config: VMConfig;
    connectionUrl: string;
}

export interface VMProvider {
    isAvailable(): Promise<boolean>;
    createVM(config: VMConfig): Promise<VMInfo>;
    stopVM(vmId: string): Promise<void>;
    deleteVM(vmId: string): Promise<void>;
    getVM(vmId: string): VMInfo | undefined;
    listVMs(): VMInfo[];
    getVMStatus(vmId: string): Promise<string>;
}
