import type { ComponentType } from "react";

export function createPage(Component: ComponentType) {
  return function Page() {
    return <Component />;
  };
}
