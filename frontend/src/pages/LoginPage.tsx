import { useState, type FormEvent } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type LoginPageProps = {
  onLogin: (storeId: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [storeId, setStoreId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedStoreId = storeId.trim();

    if (!trimmedStoreId || !password.trim()) {
      setErrorMessage("매장 ID와 비밀번호를 입력하세요.");
      return;
    }

    setErrorMessage("");
    onLogin(trimmedStoreId);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F7FB] px-6 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(219,234,254,0.95)_0%,rgba(245,245,255,0.9)_34%,rgba(240,253,250,0.82)_64%,rgba(255,247,237,0.9)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.08)_42%,rgba(255,255,255,0.58)_100%)]"
      />

      <section className="relative z-10 w-full max-w-[440px] rounded-[32px] border border-white/70 bg-white/58 px-7 py-8 shadow-[0_28px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:px-9 sm:py-10">
        <div className="mb-8 text-center">
          <h1 className="text-[32px] font-black tracking-tight text-slate-950">Fedstock 로그인</h1>
          <p className="mx-auto mt-3 max-w-[300px] text-sm font-normal leading-6 text-slate-500">
            매장 정보를 확인한 뒤<br />
            판매 예측 화면으로 이동합니다.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2.5">
            <span className="text-sm font-bold text-slate-700">매장 ID</span>
            <Input
              className="h-13 rounded-[18px] border-white/80 bg-white/78 px-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_28px_rgba(15,23,42,0.05)] placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              placeholder="junu120707@gachon.ac.kr"
              autoComplete="username"
            />
          </label>

          <label className="block space-y-2.5">
            <span className="text-sm font-bold text-slate-700">비밀번호</span>
            <Input
              className="h-13 rounded-[18px] border-white/80 bg-white/78 px-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_28px_rgba(15,23,42,0.05)] placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <div className="-mt-1 text-right">
            <a className="text-sm font-semibold text-blue-600 transition hover:text-blue-700" href="#forgot-password">
              비밀번호를 잊으셨나요?
            </a>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <Button
            className="h-13 w-full rounded-full border border-white/80 bg-white/42 text-[15px] font-black text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-14px_30px_rgba(37,99,235,0.08),0_18px_34px_rgba(37,99,235,0.12)] backdrop-blur-xl hover:border-blue-200 hover:bg-white/62 hover:text-blue-800"
            type="submit"
          >
            로그인
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          계정이 없으신가요?{" "}
          <a className="font-bold text-blue-600 transition hover:text-blue-700" href="#sign-up">
            회원가입하기
          </a>
        </p>
      </section>
    </main>
  );
}
