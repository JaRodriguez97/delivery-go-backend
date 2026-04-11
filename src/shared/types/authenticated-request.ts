import { Request } from "express";
import { TokenPayload } from "../security/token.service";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}
