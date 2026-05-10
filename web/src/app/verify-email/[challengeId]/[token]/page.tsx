import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VerifyEmailChallengeTokenPage({
  params,
}: {
  params?:
    | { challengeId?: string; token?: string }
    | Promise<{ challengeId?: string; token?: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const challengeId =
    typeof resolvedParams?.challengeId === "string"
      ? resolvedParams.challengeId
      : "";
  const token =
    typeof resolvedParams?.token === "string" ? resolvedParams.token : "";

  if (!challengeId || !token) {
    redirect("/verify-email?error=invalid_link");
  }

  redirect(
    `/verify-email/${encodeURIComponent(challengeId)}?token=${encodeURIComponent(token)}`,
  );
}
