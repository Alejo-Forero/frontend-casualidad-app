import { Injectable, Signal, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { Observable } from 'rxjs';

/**
 * Breakpoints unified with Tailwind CSS:
 *  - mobile:  ≤ 767px  → no prefix / sm:
 *  - tablet:  768–1023px → md:
 *  - desktop: ≥ 1024px  → lg:
 */
export const BREAKPOINTS = {
  MOBILE: '(max-width: 767.98px)',
  TABLET: '(min-width: 768px) and (max-width: 1023.98px)',
  BELOW_DESKTOP: '(max-width: 1023.98px)',
} as const;

@Injectable({ providedIn: 'root' })
export class ScreenSizeService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  /** Observable: true when viewport is ≤ 767px */
  readonly isMobile$: Observable<boolean> = this.breakpointObserver
    .observe(BREAKPOINTS.MOBILE)
    .pipe(
      map(state => state.matches),
      distinctUntilChanged()
    );

  /** Observable: true when viewport is 768–1023px */
  readonly isTablet$: Observable<boolean> = this.breakpointObserver
    .observe(BREAKPOINTS.TABLET)
    .pipe(
      map(state => state.matches),
      distinctUntilChanged()
    );

  /** Observable: true when viewport is < 1024px (mobile OR tablet) */
  readonly isBelowDesktop$: Observable<boolean> = this.breakpointObserver
    .observe(BREAKPOINTS.BELOW_DESKTOP)
    .pipe(
      map(state => state.matches),
      distinctUntilChanged()
    );

  /**
   * Signal: true when viewport is ≤ 767px.
   * Use in templates with `@if (screenSize.isMobile())`.
   */
  readonly isMobile: Signal<boolean> = toSignal(this.isMobile$, {
    initialValue: this.breakpointObserver.isMatched(BREAKPOINTS.MOBILE),
  });

  /**
   * Signal: true when viewport is 768–1023px.
   */
  readonly isTablet: Signal<boolean> = toSignal(this.isTablet$, {
    initialValue: this.breakpointObserver.isMatched(BREAKPOINTS.TABLET),
  });

  /**
   * Signal: true when viewport is < 1024px (mobile OR tablet).
   * Primary signal for sidebar collapse logic.
   */
  readonly isBelowDesktop: Signal<boolean> = toSignal(this.isBelowDesktop$, {
    initialValue: this.breakpointObserver.isMatched(BREAKPOINTS.BELOW_DESKTOP),
  });
}
