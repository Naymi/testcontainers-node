import { AbstractStartedContainer, GenericContainer, StartedTestContainer, Wait } from "testcontainers";

const CLIENT_PORT = 4222;
const ROUTING_PORT_FOR_CLUSTERING = 6222;
const HTTP_MANAGEMENT_PORT = 8222;

const USER_ARGUMENT_KEY = "--user";
const PASS_ARGUMENT_KEY = "--pass";

export class NatsContainer extends GenericContainer {
  private args = new Set<string>()
  private values = new Map<string, string>()

  constructor(image = "nats:2.8.4-alpine") {
    super(image);
    this.withUsername('test')
    this.withPass('test')

    this.withExposedPorts(CLIENT_PORT, ROUTING_PORT_FOR_CLUSTERING, HTTP_MANAGEMENT_PORT)
      .withWaitStrategy(Wait.forLogMessage(/.*Server is ready.*/))
      .withStartupTimeout(120_000);
  }

  public withUsername(user: string): this {
    this.withArg(USER_ARGUMENT_KEY, user)
    return this;
  }

  /**
   * Enable JetStream
   * @returns {this}
   */
  public withJS(): this {
    this.withArg('-js')
    return this;
  }

  public withPass(pass: string): this {
    this.withArg(PASS_ARGUMENT_KEY, pass)
    return this;
  }

  public withArg(name: string, value: string): this
  public withArg(name: string): this
  public withArg(...args: [string, string] | [string]): this {
    let [name, value] = args
    name = NatsContainer.ensureDashInFrontOfArgumentName(name);
    this.args.add(name)
    if (args.length === 2) {
      this.values.set(name, value!)
    }
    return this;
  }

  private static ensureDashInFrontOfArgumentName(name: string): string {
    if (name.startsWith("--") || name.startsWith("-")) {
      return name;
    }

    if (name.length == 1) {
      return "-" + name;
    } else {
      return "--" + name;
    }
  }

  public override async start(): Promise<StartedNatsContainer> {
    this.withCommand(this.getNormalizedCommand());
    return new StartedNatsContainer(await super.start(), this.getUser(), this.getPass());
  }

  private getUser(): string {
    return this.values.get(USER_ARGUMENT_KEY)!;
  }

  private getPass(): string {
    return this.values.get(PASS_ARGUMENT_KEY)!;
  }

  private getNormalizedCommand(): string[] {
    const result: string[] = ['nats-server']
    for (const arg of this.args) {
      result.push(arg)
      if (this.values.has(arg)) {
        result.push(this.values.get(arg)!)
      }
    }
    return result
  }
}

export class StartedNatsContainer extends AbstractStartedContainer {
  private readonly connectionOptions: NatsConnectionOptions;

  constructor(startedTestContainer: StartedTestContainer, readonly username: string, readonly password: string) {
    super(startedTestContainer);
    const port = startedTestContainer.getMappedPort(CLIENT_PORT);
    this.connectionOptions = {
      servers: `${this.startedTestContainer.getHost()}:${port}`,
      user: this.username,
      pass: this.password,
    };
  }

  public getConnectionOptions(): NatsConnectionOptions {
    return this.connectionOptions;
  }
}

export interface NatsConnectionOptions {
  debug?: boolean;
  maxPingOut?: number;
  maxReconnectAttempts?: number;
  name?: string;
  noEcho?: boolean;
  noRandomize?: boolean;
  pass?: string;
  pedantic?: boolean;
  pingInterval?: number;
  port?: number;
  reconnect?: boolean;
  reconnectDelayHandler?: () => number;
  reconnectJitter?: number;
  reconnectJitterTLS?: number;
  reconnectTimeWait?: number;
  servers?: Array<string> | string;
  timeout?: number;
  tls?: NatsTlsOptions;
  token?: string;
  user?: string;
  verbose?: boolean;
  waitOnFirstConnect?: boolean;
  ignoreClusterUpdates?: boolean;
  inboxPrefix?: string;
}

export interface NatsTlsOptions {
  certFile?: string;
  cert?: string;
  caFile?: string;
  ca?: string;
  keyFile?: string;
  key?: string;
}
