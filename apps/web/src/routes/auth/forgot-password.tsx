import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
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
import { AuthLayout } from "../../components/auth/layout";

const forgotPasswordSearchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPassword,
  validateSearch: forgotPasswordSearchSchema,
});

const emailSchema = z.object({
  email: z.email(),
});

type EmailFormValues = z.infer<typeof emailSchema>;

function ForgotPassword() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/auth/forgot-password" });
  const [isPending, setIsPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<EmailFormValues>({
    resolver: standardSchemaResolver(emailSchema),
    defaultValues: { email: search.email || "" },
  });

  const onSubmit = async (data: EmailFormValues) => {
    setIsPending(true);
    try {
      // The API answers identically for known and unknown addresses so it can't
      // be used to probe who has an account. Mirror that here: always confirm.
      await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      setSentTo(data.email);
    } finally {
      setIsPending(false);
    }
  };

  if (sentTo) {
    return (
      <>
        <PageTitle title={t("auth:forgotPassword.pageTitle")} />
        <AuthLayout title={t("auth:forgotPassword.sentTitle")}>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <Trans
                i18nKey="auth:forgotPassword.sentMessage"
                values={{ email: sentTo }}
                components={{
                  email: <span className="text-foreground font-medium" />,
                }}
              />
            </p>
            <Button
              variant="ghost"
              render={<Link to="/auth/sign-in" />}
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("auth:forgotPassword.backToSignIn")}
            </Button>
          </div>
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("auth:forgotPassword.pageTitle")} />
      <AuthLayout
        title={t("auth:forgotPassword.title")}
        subtitle={t("auth:forgotPassword.subtitle")}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("auth:forms.email")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("auth:forms.emailPlaceholder")}
                      type="email"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending} className="w-full mt-4">
              {isPending
                ? t("auth:forgotPassword.sending")
                : t("auth:forgotPassword.sendResetLink")}
            </Button>
          </form>
        </Form>

        <Button
          variant="ghost"
          render={<Link to="/auth/sign-in" />}
          className="w-full h-8 mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          {t("auth:forgotPassword.backToSignIn")}
        </Button>
      </AuthLayout>
    </>
  );
}
