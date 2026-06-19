declare module "passport-discord" {
  import { Strategy as PassportStrategy } from "passport";

  export interface Profile {
    id: string;
    username: string;
    avatar: string | null;
    email?: string;
    global_name?: string;
    discriminator?: string;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope: string[];
  }

  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyCallback);
    name: string;
    authenticate(req: any, options?: any): void;
  }
}
