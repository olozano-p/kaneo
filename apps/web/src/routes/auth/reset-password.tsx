import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { AuthLayout } from "../../components/auth/layout";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPassword,
  validateSearch: resetPasswordSearchSchema,
});

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/reset-password" });
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const resetPasswordSchema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, {
            message: t("auth:resetPassword.passwordTooShort"),
          }),
          confirmPassword: z.string(),
        })
        .refine((values) => values.password === values.confirmPassword, {
          message: t("auth:resetPassword.passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  const form = useForm<ResetPasswordFormValues>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const token = search.token;

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;

    setIsPending(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (result.error) {
        toast.error(
          result.error.message || t("auth:resetPassword.failedReset"),
        );
        return;
      }

      toast.success(t("auth:resetPassword.passwordResetSuccess"));
      navigate({ to: "/auth/sign-in" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("auth:resetPassword.failedReset"),
      );
    } finally {
      setIsPending(false);
    }
  };

  // The API redirects here with `?error=INVALID_TOKEN` when the link expired or
  // was already used, and a hand-typed URL arrives with no token at all.
  if (!token || search.error) {
    return (
      <>
        <PageTitle title={t("auth:resetPassword.pageTitle")} />
        <AuthLayout title={t("auth:resetPassword.invalidLinkTitle")}>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("auth:resetPassword.invalidLinkMessage")}
            </p>
            <Button
              render={<Link to="/auth/forgot-password" />}
              className="w-full"
            >
              {t("auth:resetPassword.requestNewLink")}
            </Button>
          </div>
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("auth:resetPassword.pageTitle")} />
      <AuthLayout
        title={t("auth:resetPassword.title")}
        subtitle={t("auth:resetPassword.subtitle")}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("auth:resetPassword.newPassword")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder={t("auth:forms.passwordPlaceholder")}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={
                          showPassword
                            ? t("auth:forms.hidePassword")
                            : t("auth:forms.showPassword")
                        }
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("auth:resetPassword.confirmPassword")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth:forms.passwordPlaceholder")}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending} className="w-full mt-4">
              {isPending
                ? t("auth:resetPassword.resetting")
                : t("auth:resetPassword.resetPassword")}
            </Button>
          </form>
        </Form>
      </AuthLayout>
    </>
  );
}
