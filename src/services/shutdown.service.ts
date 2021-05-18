import { Observable, Subject } from "rxjs";
import { Service } from "typedi";

@Service()
export default class ShutdownService {
  public shutdownRequest = new Subject<number>();

  getShutdownRequest(): Observable<number> {
    return this.shutdownRequest.asObservable();
  }

  sendShutdownRequest(status: number): void {
    this.shutdownRequest.next(status);
  }
}
