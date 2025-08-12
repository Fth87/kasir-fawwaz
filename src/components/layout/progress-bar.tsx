'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

export function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    const handleAnchorClick = (event: Event) => {
      const targetUrl = (event.currentTarget as HTMLAnchorElement).href;
      const currentUrl = new URL(window.location.href);
      const newUrl = new URL(targetUrl);

      // Check if the navigation is internal and not just a hash change
      if (newUrl.origin === currentUrl.origin && newUrl.pathname !== currentUrl.pathname) {
          NProgress.start();
      }
    };

    const handleMutation = () => {
      const anchorElements = document.querySelectorAll('a[href]');
      anchorElements.forEach(anchor => {
        // To avoid adding multiple listeners, we can add a custom attribute
        if (!anchor.hasAttribute('data-nprogress-handled')) {
          anchor.addEventListener('click', handleAnchorClick);
          anchor.setAttribute('data-nprogress-handled', 'true');
        }
      });
    };

    const mutationObserver = new MutationObserver(handleMutation);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // Initial run
    handleMutation();

    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return null;
}
