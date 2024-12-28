import { type ComputedRef, inject, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SockJS from 'sockjs-client';
import { map } from 'rxjs';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';

const DESTINATION_TRACKER = '/topic/tracker';
const DESTINATION_ACTIVITY = '/topic/activity';

export const useTrackerService = ({ stomp, authenticated }: { stomp?: RxStomp; authenticated?: ComputedRef<boolean> } = {}) => {
  const router = useRouter();
  authenticated = authenticated ?? inject('authenticated');
  const trackerService = new TrackerService({ stomp });

  router.afterEach(to => trackerService.sendActivity(to.fullPath));

  watch(trackerService.status, value => {
    if (value === 'open') {
      trackerService.sendActivity(router.currentRoute.value.fullPath);
    }
  });

  watch(
    authenticated,
    (value, prevValue) => {
      if (value === prevValue) return;
      if (value) {
        trackerService.connect();
      } else {
        trackerService.disconnect();
      }
    },
    { immediate: true },
  );
  return trackerService;
};

export default class TrackerService {
  public status = ref<'open' | 'connecting' | 'closing' | 'closed'>('closed');
  private rxStomp: RxStomp;

  constructor({ stomp }: { stomp?: RxStomp }) {
    this.stomp = stomp ?? new RxStomp();
  }

  get stomp() {
    return this.rxStomp;
  }

  set stomp(rxStomp) {
    this.rxStomp = rxStomp;
    this.rxStomp.configure({
      debug: (msg: string): void => {
        console.log(new Date(), msg);
      },
    });

    this.rxStomp.connectionState$.subscribe(state => {
      switch (state) {
        case RxStompState.CONNECTING:
          this.status.value = 'connecting';
          return;
        case RxStompState.OPEN:
          this.status.value = 'open';
          return;
        case RxStompState.CLOSING:
          this.status.value = 'closing';
          return;
        case RxStompState.CLOSED:
          this.status.value = 'closed';
      }
    });
  }

  public connect(): void {
    this.updateCredentials();
    this.rxStomp.activate();
  }

  public async disconnect(): Promise<void> {
    await this.rxStomp.deactivate();
  }

  private getAuthToken() {
    const authToken = localStorage.getItem('jhi-authenticationToken') || sessionStorage.getItem('jhi-authenticationToken');
    return authToken;
  }

  private buildUrl(): string {
    // building absolute path so that websocket doesn't fail when deploying with a context path
    const loc = window.location;
    const baseHref = document.querySelector('base')?.getAttribute('href');
    const url = `//${loc.host}${baseHref ?? '/'}websocket/tracker`;
    const authToken = this.getAuthToken();
    if (authToken) {
      return `${url}?access_token=${authToken}`;
    }
    return url;
  }

  private updateCredentials(): void {
    this.rxStomp.configure({
      webSocketFactory: () => {
        return new SockJS(this.buildUrl());
      },
    });
  }

  public sendActivity(page: string): void {
    this.rxStomp.publish({
      destination: DESTINATION_ACTIVITY,
      body: JSON.stringify({ page }),
    });
  }

  public subscribe(observer) {
    return this.rxStomp
      .watch(DESTINATION_TRACKER)
      .pipe(map(imessage => JSON.parse(imessage.body)))
      .subscribe(observer);
  }
}
