import { requireNativeModule } from "expo";
export const pinWidget = () =>
  requireNativeModule<{ pinWidget(): Promise<boolean> }>("PolydaysStorage").pinWidget();
