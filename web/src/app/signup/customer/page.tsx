import { redirect } from "next/navigation";

export default function CustomerSignupRedirectPage() {
  redirect("/signup?type=customer");
}
