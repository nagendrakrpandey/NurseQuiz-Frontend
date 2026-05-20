import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const scrollElementToTop = (element: Element | Window) => {
  if ("scrollTo" in element) {
    element.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return;
  }

  (element as HTMLElement).scrollTop = 0;
  (element as HTMLElement).scrollLeft = 0;
};

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    const resetScroll = () => {
      scrollElementToTop(window);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      document
        .querySelectorAll<HTMLElement>(
          "main, [data-radix-scroll-area-viewport], .overflow-y-auto, .overflow-auto, .overflow-scroll"
        )
        .forEach((element) => {
          if (element.scrollTop > 0 || element.scrollLeft > 0 || element.scrollHeight > element.clientHeight) {
            scrollElementToTop(element);
          }
        });
    };

    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
