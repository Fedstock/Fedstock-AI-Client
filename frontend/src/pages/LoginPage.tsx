import { Check, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { login, signup, type AuthResult, type CurrentUser } from "../api/auth";
import { getApiErrorMessage } from "../api/errors";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { cn } from "../lib/utils";

type AuthMode = "login" | "signup";

type LoginPageProps = {
  onLogin: (storeId: string) => void;
};

type PasswordFieldProps = {
  label: string;
  value: string;
  visible: boolean;
  autoComplete: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggleVisible: () => void;
};

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

const SPECIAL_CHARACTER_PATTERN = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/;

const PASSWORD_RULES = [
  {
    label: "8자 이상",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "영문 포함",
    test: (value: string) => /[A-Za-z]/.test(value),
  },
  {
    label: "숫자 포함",
    test: (value: string) => /\d/.test(value),
  },
  {
    label: "특수문자 포함",
    test: (value: string) => SPECIAL_CHARACTER_PATTERN.test(value),
  },
];

const authCopy = {
  login: {
    eyebrow: "Welcome back",
    title: "Fedstock 로그인",
    description: "중앙 서버 계정으로 접속해 예측을 확인하세요.",
    submit: "로그인",
    submitting: "로그인 중",
    switchPrompt: "계정이 없으신가요?",
    switchAction: "회원가입하기",
    visualTitle: "매장 데이터 흐름을 한 곳에서 이어가세요",
    visualBody: "판매 이력 업로드부터 예측 결과 확인까지 Fedstock 계정으로 안전하게 연결됩니다.",
  },
  signup: {
    eyebrow: "Get started",
    title: "계정 만들기",
    description: "매장 계정을 등록하고 예측 워크스페이스를 시작하세요.",
    submit: "회원가입",
    submitting: "가입 중",
    switchPrompt: "이미 계정이 있으신가요?",
    switchAction: "로그인하기",
    visualTitle: "새 매장의 예측 루틴을 시작하세요",
    visualBody: "중앙 인증 계정으로 로그인하고 로컬 POS 데이터 기반 예측 화면으로 이동합니다.",
  },
} satisfies Record<AuthMode, {
  eyebrow: string;
  title: string;
  description: string;
  submit: string;
  submitting: string;
  switchPrompt: string;
  switchAction: string;
  visualTitle: string;
  visualBody: string;
}>;

function userLabel(user: CurrentUser | undefined, fallback: string) {
  return user?.name ?? user?.storeId ?? user?.email ?? fallback;
}

function TextField({ label, className, ...props }: TextFieldProps) {
  return (
    <label className="block space-y-3">
      <span className="text-[13px] font-normal text-[#343A4A]">{label}</span>
      <Input
        className={cn(
          "h-[42px] rounded-lg border-[#D9DDE7] bg-white px-4 text-[14px] font-semibold text-[#141824] shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:font-medium placeholder:text-[#9AA3B2] hover:border-[#B8C0D4] focus:border-[#5B4BFF] focus:bg-white focus:ring-4 focus:ring-[#5B4BFF]/10 disabled:bg-[#F7F8FB]",
          className,
        )}
        {...props}
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  visible,
  autoComplete,
  placeholder,
  disabled,
  onChange,
  onToggleVisible,
}: PasswordFieldProps) {
  const Icon = visible ? EyeOff : Eye;

  return (
    <label className="block space-y-3">
      <span className="text-[13px] font-normal text-[#343A4A]">{label}</span>
      <div className="relative">
        <Input
          className="h-[42px] rounded-lg border-[#D9DDE7] bg-white px-4 pr-12 text-[14px] font-semibold text-[#141824] shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:font-medium placeholder:text-[#9AA3B2] hover:border-[#B8C0D4] focus:border-[#5B4BFF] focus:bg-white focus:ring-4 focus:ring-[#5B4BFF]/10 disabled:bg-[#F7F8FB]"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#7A8498] transition duration-200 hover:bg-[#F0F3FA] hover:text-[#343A4A] focus:outline-none focus:ring-2 focus:ring-[#5B4BFF]/20 disabled:opacity-50"
          onClick={onToggleVisible}
          aria-label={visible ? `${label} 숨기기` : `${label} 보기`}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </label>
  );
}

function getPasswordIssues(value: string) {
  return PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label);
}

function getAuthErrorMessage(error: unknown, isSignup: boolean) {
  const fallbackMessage = isSignup ? "입력 정보를 확인해 주세요." : "이메일 또는 비밀번호를 확인해 주세요.";
  const rawMessage = getApiErrorMessage(error, fallbackMessage).trim();
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    (normalizedMessage.includes("email") || rawMessage.includes("이메일")) &&
    (rawMessage.includes("형식") ||
      rawMessage.includes("올바른") ||
      normalizedMessage.includes("valid") ||
      normalizedMessage.includes("format"))
  ) {
    return "올바른 이메일 주소를 입력해 주세요.";
  }

  if (
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("invalid credentials") ||
    rawMessage.includes("인증") ||
    rawMessage.includes("비밀번호가 일치")
  ) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (
    (normalizedMessage.includes("already") ||
      normalizedMessage.includes("duplicate") ||
      normalizedMessage.includes("exists") ||
      rawMessage.includes("이미") ||
      rawMessage.includes("중복")) &&
    (normalizedMessage.includes("email") || normalizedMessage.includes("account") || rawMessage.includes("계정"))
  ) {
    return "이미 가입된 계정입니다. 로그인해 주세요.";
  }

  if (
    normalizedMessage.includes("password") &&
    (normalizedMessage.includes("weak") ||
      normalizedMessage.includes("short") ||
      normalizedMessage.includes("validation") ||
      rawMessage.includes("조건"))
  ) {
    return "비밀번호 조건을 확인해 주세요.";
  }

  if (normalizedMessage.includes("accesstoken") || normalizedMessage.includes("jwt") || normalizedMessage.includes("token")) {
    return "로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.";
  }

  if (/^[a-z0-9_.-]+:\s*/i.test(rawMessage)) {
    return fallbackMessage;
  }

  return rawMessage || fallbackMessage;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const passwordIssues = isSignup ? getPasswordIssues(password) : [];
  const hasPasswordInput = password.length > 0;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage("");
    setPassword("");
    setPasswordConfirm("");
    setShowPassword(false);
    setShowPasswordConfirm(false);
  };

  const completeAuth = (result: AuthResult, fallbackIdentifier: string) => {
    onLogin(userLabel(result.user, fallbackIdentifier));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedIdentifier = identifier.trim();
    const trimmedName = name.trim();

    if (!trimmedIdentifier || !password.trim()) {
      setErrorMessage("아이디와 비밀번호를 입력하세요.");
      return;
    }

    if (isSignup && !trimmedName) {
      setErrorMessage("회원가입에 사용할 이름 또는 매장명을 입력하세요.");
      return;
    }

    if (isSignup && passwordIssues.length > 0) {
      setErrorMessage(`비밀번호는 ${passwordIssues.join(", ")} 조건을 만족해야 합니다.`);
      return;
    }

    if (isSignup && password !== passwordConfirm) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = isSignup
        ? await signup({ identifier: trimmedIdentifier, password, name: trimmedName })
        : await login({ identifier: trimmedIdentifier, password });

      completeAuth(result, trimmedIdentifier);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, isSignup));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copy = authCopy[mode];

  return (
    <main className="h-screen overflow-hidden bg-white text-[#111827]">
      {errorMessage ? (
        <div
          key={errorMessage}
          className="auth-toast-enter fixed right-5 top-5 z-50 max-w-[360px] rounded-[18px] border border-[#F6CAC9] bg-white px-5 py-4 text-sm font-medium leading-5 text-[#BA2F2A] shadow-[0_18px_46px_rgba(148,35,35,0.16)]"
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </div>
      ) : null}
      <section className="grid h-full min-h-screen w-full overflow-hidden bg-white lg:grid-cols-[1.03fr_0.97fr]">
        <aside className="relative hidden h-full min-h-screen overflow-hidden bg-[linear-gradient(135deg,#95F0FF_0%,#5A6BFF_34%,#1C0B98_55%,#D8EFFF_100%)] p-10 text-white lg:block xl:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_28%,rgba(255,255,255,0.74),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0)_40%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <span className="text-lg font-black tracking-[0.02em]">Fedstock</span>

            <div key={mode} className="auth-mode-enter max-w-[390px] pb-3">
              <p className="text-sm font-semibold text-white/88">{copy.eyebrow}</p>
              <h2 className="mt-4 text-[32px] font-black leading-[1.12] tracking-normal text-white [word-break:keep-all]">
                {copy.visualTitle}
              </h2>
              <p className="mt-4 max-w-[340px] text-[15px] font-medium leading-6 text-white/82 [word-break:keep-all]">
                {copy.visualBody}
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen items-center justify-center overflow-y-auto px-6 py-8 sm:px-10 lg:px-14">
          <div key={mode} className="auth-panel-enter w-full max-w-[360px]">
            <div className="mb-11">
              <p className="mb-4 text-[13px] font-black uppercase tracking-[0.14em] text-[#5B4BFF]">
                {copy.eyebrow}
              </p>
              <h1 className="text-[30px] font-black leading-tight tracking-normal text-[#090B13] [word-break:keep-all]">
                {copy.title}
              </h1>
              <p className="mt-5 text-[14px] font-medium leading-6 text-[#737B8D] [word-break:keep-all]">
                {copy.description}
              </p>
            </div>

            <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-6">
                {isSignup ? (
                  <TextField
                    label="이름 또는 매장명"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="예: Gachon Market"
                    autoComplete="name"
                    disabled={isSubmitting}
                  />
                ) : null}

                <TextField
                  label="이메일"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="store@fedstock.com"
                  autoComplete="username"
                  disabled={isSubmitting}
                />

                <PasswordField
                  label="비밀번호"
                  value={password}
                  visible={showPassword}
                  onChange={setPassword}
                  onToggleVisible={() => setShowPassword((current) => !current)}
                  placeholder="8자 이상 입력"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  disabled={isSubmitting}
                />

                {isSignup ? (
                  <div className="-mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-normal">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(password);

                      return (
                        <span
                          key={rule.label}
                          className={cn(
                            "inline-flex items-center gap-1.5 transition-colors duration-200",
                            !hasPasswordInput
                              ? "text-[#9AA3B2]"
                              : passed
                                ? "text-[#16A34A]"
                              : "text-[#D14343]",
                          )}
                        >
                          <Check
                            className={cn(
                              "h-3.5 w-3.5 transition-opacity duration-200",
                              !hasPasswordInput || passed ? "opacity-100" : "opacity-45",
                            )}
                            aria-hidden="true"
                          />
                          {rule.label}
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                {isSignup ? (
                  <PasswordField
                    label="비밀번호 확인"
                    value={passwordConfirm}
                    visible={showPasswordConfirm}
                    onChange={setPasswordConfirm}
                    onToggleVisible={() => setShowPasswordConfirm((current) => !current)}
                    placeholder="비밀번호를 한 번 더 입력"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                  />
                ) : null}
              </div>

              <Button
                className="group h-[52px] w-full overflow-hidden rounded-[22px] bg-[#4F3DFF] px-5 text-[15px] font-black text-white shadow-[0_14px_26px_rgba(79,61,255,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#432FE7] hover:shadow-[0_18px_34px_rgba(79,61,255,0.34)] active:translate-y-0 disabled:translate-y-0 disabled:shadow-none"
                type="submit"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? copy.submitting : copy.submit}</span>
              </Button>
            </form>

            <p className="mt-9 text-center text-sm font-medium text-[#7A8498]">
              {copy.switchPrompt}{" "}
              <button
                type="button"
                className="font-semibold text-[#4F3DFF] transition-colors duration-200 hover:text-[#3324C8] focus:outline-none focus:ring-2 focus:ring-[#5B4BFF]/20"
                onClick={() => switchMode(isSignup ? "login" : "signup")}
                disabled={isSubmitting}
              >
                {copy.switchAction}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
