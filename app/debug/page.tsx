import { redirect } from "next/navigation";
import DebugClient from "./DebugClient";

export default function DebugPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }
  return <DebugClient />;
}
