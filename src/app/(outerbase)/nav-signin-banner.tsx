import { useSession } from "./session-provider";

export default function NavigationSigninBanner() {
  const { isLoading, session } = useSession();

  // 本地工具不需要云账号登录横幅 - 已隐藏
  // eslint-disable-next-line no-constant-condition
  if (isLoading || !session || true) {
    return null;
  }

  // 保留代码以备将来恢复
  return null;
}
