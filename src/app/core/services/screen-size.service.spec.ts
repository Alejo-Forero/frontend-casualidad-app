import { TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { ScreenSizeService, BREAKPOINTS } from './screen-size.service';

/** Factory to create a minimal BreakpointState object. */
function makeState(matches: boolean): BreakpointState {
  return { matches, breakpoints: {} };
}

describe('ScreenSizeService', () => {
  let service: ScreenSizeService;
  let mobileSubject: Subject<BreakpointState>;
  let tabletSubject: Subject<BreakpointState>;
  let belowDesktopSubject: Subject<BreakpointState>;

  const buildMockObserver = () => ({
    observe: (queries: string | readonly string[]) => {
      const q = Array.isArray(queries) ? queries[0] : queries;
      if (q === BREAKPOINTS.MOBILE) return mobileSubject.asObservable();
      if (q === BREAKPOINTS.TABLET) return tabletSubject.asObservable();
      return belowDesktopSubject.asObservable();
    },
    isMatched: (query: string) => {
      if (query === BREAKPOINTS.MOBILE) return false;
      if (query === BREAKPOINTS.TABLET) return false;
      return false;
    },
  });

  beforeEach(() => {
    mobileSubject = new Subject<BreakpointState>();
    tabletSubject = new Subject<BreakpointState>();
    belowDesktopSubject = new Subject<BreakpointState>();

    TestBed.configureTestingModule({
      providers: [
        ScreenSizeService,
        { provide: BreakpointObserver, useFactory: buildMockObserver },
      ],
    });
    service = TestBed.inject(ScreenSizeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isMobile$', () => {
    it('should emit true when viewport matches MOBILE breakpoint', done => {
      service.isMobile$.subscribe(value => {
        expect(value).toBe(true);
        done();
      });
      mobileSubject.next(makeState(true));
    });

    it('should emit false when viewport does not match MOBILE breakpoint', done => {
      service.isMobile$.subscribe(value => {
        expect(value).toBe(false);
        done();
      });
      mobileSubject.next(makeState(false));
    });

    it('should not emit duplicate consecutive values', () => {
      const emitted: boolean[] = [];
      service.isMobile$.subscribe(v => emitted.push(v));
      mobileSubject.next(makeState(true));
      mobileSubject.next(makeState(true)); // duplicate – should be filtered
      mobileSubject.next(makeState(false));
      expect(emitted).toEqual([true, false]);
    });
  });

  describe('isTablet$', () => {
    it('should emit true when viewport matches TABLET breakpoint', done => {
      service.isTablet$.subscribe(value => {
        expect(value).toBe(true);
        done();
      });
      tabletSubject.next(makeState(true));
    });

    it('should emit false when viewport does not match TABLET breakpoint', done => {
      service.isTablet$.subscribe(value => {
        expect(value).toBe(false);
        done();
      });
      tabletSubject.next(makeState(false));
    });
  });

  describe('isBelowDesktop$', () => {
    it('should emit true when viewport is below desktop', done => {
      service.isBelowDesktop$.subscribe(value => {
        expect(value).toBe(true);
        done();
      });
      belowDesktopSubject.next(makeState(true));
    });

    it('should emit false when viewport is desktop size', done => {
      service.isBelowDesktop$.subscribe(value => {
        expect(value).toBe(false);
        done();
      });
      belowDesktopSubject.next(makeState(false));
    });
  });

  describe('Signals', () => {
    it('isMobile signal should have a boolean initial value', () => {
      TestBed.runInInjectionContext(() => {
        expect(typeof service.isMobile()).toBe('boolean');
      });
    });

    it('isTablet signal should have a boolean initial value', () => {
      TestBed.runInInjectionContext(() => {
        expect(typeof service.isTablet()).toBe('boolean');
      });
    });

    it('isBelowDesktop signal should have a boolean initial value', () => {
      TestBed.runInInjectionContext(() => {
        expect(typeof service.isBelowDesktop()).toBe('boolean');
      });
    });

    it('isMobile signal should update reactively', () => {
      TestBed.runInInjectionContext(() => {
        expect(service.isMobile()).toBe(false);
        mobileSubject.next(makeState(true));
        TestBed.flushEffects();
        expect(service.isMobile()).toBe(true);
      });
    });
  });

  describe('BREAKPOINTS constants', () => {
    it('should have correct MOBILE breakpoint string', () => {
      expect(BREAKPOINTS.MOBILE).toBe('(max-width: 767.98px)');
    });

    it('should have correct TABLET breakpoint string', () => {
      expect(BREAKPOINTS.TABLET).toBe('(min-width: 768px) and (max-width: 1023.98px)');
    });

    it('should have correct BELOW_DESKTOP breakpoint string', () => {
      expect(BREAKPOINTS.BELOW_DESKTOP).toBe('(max-width: 1023.98px)');
    });
  });
});
