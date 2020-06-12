import {ConfConnectionInfo, Confluence} from "ts-confluence-client";
import {Application} from 'express';
import {Connection, ConnectionConfig, GlobalConfig} from "@nexus-switchboard/nexus-extend";
import {AtlassianAddon, WebhookConfiguration} from "atlassian-addon-helper";

export interface IConfluenceConfig {
    connection: ConfConnectionInfo;

    // This is required if you are adding functionality that requires that a Jira instance communicate
    // with this module (webhooks, for example).
    subApp?: Application;

    // If the name and key are not filled in then an addon will not
    //  be  created.  Otherwise, a new AtlassianAddon object will be
    //  created and instantiated  under the addon property of this JiraConnection
    //  instance.
    addon?: {
        key: string;
        name: string;
        description?: string;
        vendor?: {
            name: string;
            url: string;
        }
    };

    // If there are any settings that would cause this connection to expose endpoints, then
    //  this is the base URL expected for that endpoint.  This is expected to be everything before the portion
    //  of the path that will be handled by the connection.  In other words, it might be something like this:
    //      https://mydomain.com/m/mymod
    baseUrl?: string;

    // A list of webhooks to register for.
    //  https://developer.atlassian.com/cloud/jira/platform/modules/webhook/
    webhooks: WebhookConfiguration[];

    // The key/value store to use with keyv to store persistant data. Note that this can be either redis or
    //  SQLite and the connection string docs are available here: https://github.com/lukechilds/keyv
    connectionString: string;

}

/**
 * The  Confluence connection object is capable of hosting an Addon server but also
 * connects and exposes the REST API for Jira.  In this capacity, it makes public
 * a property called "api" which is an instance of the ts-confluence-client library.
 * Information at the  library is available here:
 *  https://jira-node.github.io/
 *
 *  An addon, at a minimum needs a unique key and a name.  But for it actually
 *      do something you will need to fill in the IJiraConfig prop with
 *      Jira module extensions (like webhooks or something else that can only
 *      be done by an addon).
 */
export class ConfluenceConnection extends Connection {
    public api: Confluence;

    public name = "Confluence";
    public config: IConfluenceConfig;
    public addon: AtlassianAddon;

    public connect(): ConfluenceConnection {
        this.api = new Confluence(this.config.connection);

        // Confluence Add-On Setup
        this.setupAddon();

        return this;
    }

    public disconnect(): boolean {
        delete this.api;
        return true;
    }

    /**
     * If the Confluence configuration given has any indication that this will act as a Confluence Add-On
     * (meaning) that it has something like webhooks specified, then this will setup the connection
     * to be able to receive requests from Jira.
     *
     * The Atlassian Addon (Connect) Descriptor is a well-defined object that is returned from
     * a known endpoint for this addon.  Information about the addon can be found here:
     *  https://developer.atlassian.com/cloud/jira/platform/app-descriptor/
     *
     * The endpoints from the addon setup are as follows:
     *
     *  Webhooks:
     *      POST ${config.addon.baseUrl}/${BASE_PATH_ADDON}/webhooks/${event-name}
     *
     *  Descriptor:
     *      GET ${config.addon.baseUrl}/${BASE_PATH_ADDON}/addon
     */
    public setupAddon() {

        if (!this.config.addon) {
            return;
        }

        // Now create the addon object which handles constructing the addon as
        //  expected by Jira.
        this.addon = new AtlassianAddon({
                key: this.config.addon.key,
                name: this.config.addon.name,
                description: this.config.addon.description,
                vendor: this.config.addon.vendor,
                baseUrl: this.config.baseUrl,
                authentication: {               // authentication type
                    type: 'jwt'
                }
            },
            this.config.subApp,             // root app
            "/jira/addon",                  // path to addon endpoints
            this.config.connectionString,   // db connection string
            undefined,                      // max token age
            {
                apiToken: this.config.connection.apiToken,
                username: this.config.connection.username,
                host: this.config.connection.host
            }
        );

        if (this.config.webhooks) {

            this.addon.addWebhooks(this.config.webhooks);
        }
    }

}

export default function createConnection(cfg: ConnectionConfig, globalCfg: GlobalConfig): Connection {
    return new ConfluenceConnection(cfg, globalCfg);
}
