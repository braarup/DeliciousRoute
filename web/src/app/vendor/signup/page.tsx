import { redirect } from "next/navigation";

export default function VendorSignupRedirectPage() {
  redirect("/signup?type=vendor");
}
