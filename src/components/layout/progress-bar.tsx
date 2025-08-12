'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

export function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // This useEffect handles stopping the progress bar when navigation is complete.
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

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

  return null; // This component does not render anything.
}
