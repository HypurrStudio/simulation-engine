import { redirect } from "next/navigation"

export default function DashboardIndexRedirect() {
  redirect("/dashboard/explorer")
}
