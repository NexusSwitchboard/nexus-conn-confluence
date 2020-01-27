import {ConfConnectionInfo, Confluence} from "ts-confluence-client";
import {Connection, ConnectionConfig} from "@nexus-switchboard/nexus-extend";

export type ConfluenceConfig = ConfConnectionInfo;

export class ConfluenceConnection extends Connection {
    public api: Confluence;

    public name = "Confluence";
    public config: ConfluenceConfig;

    public connect(): ConfluenceConnection {
        this.api = new Confluence(this.config);
        return this;
    }

    public disconnect(): boolean {
        delete this.api;
        return true;
    }
}

export default function createConnection(cfg: ConnectionConfig): Connection {
    return new ConfluenceConnection(cfg);
}
