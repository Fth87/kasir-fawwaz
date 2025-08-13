'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css'; // Import nprogress's styles

export function ProgressBar() {
  const pathname = usePathname();

  // This useEffect handles stopping the progress bar when navigation is complete.
  useEffect(() => {
    NProgress.done();
  }, [pathname]);

  // This useEffect handles starting the progress bar by patching browser history methods.
  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Patch pushState to trigger NProgress.start()
    history.pushState = function (...args) {
      NProgress.start();
      originalPushState.apply(history, args);
    };

    // Patch replaceState as well
    history.replaceState = function (...args) {
      NProgress.start();
      originalReplaceState.apply(history, args);
    };

    // Listen to popstate for back/forward browser buttons
    const handlePopState = () => {
        NProgress.start();
    };

    window.addEventListener('popstate', handlePopState);

    // Cleanup function to restore original methods on component unmount
    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Custom CSS to use the theme's accent color
  // This is a bit of a hack, but it's the simplest way to theme nprogress
  // without keeping a separate CSS file.
  const accentColor = '#FFAB40'; // Hardcoded accent color
  const styles = (
    <style>{`
      #nprogress .bar {
        background: ${accentColor} !important;
        height: 3px !important;
        z-index: 99999 !important;
      }
      #nprogress .peg {
        box-shadow: 0 0 10px ${accentColor}, 0 0 5px ${accentColor} !important;
      }
    `}</style>
  );

  return styles;
}
