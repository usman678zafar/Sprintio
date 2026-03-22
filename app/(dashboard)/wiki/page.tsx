import WikiClient from "./WikiClient";

export const metadata = {
  title: "Wiki | Sprinto",
  description: "Explore your workspace knowledge base, delivery playbooks, and team standards.",
};

export default function WikiPage() {
  return <WikiClient />;
}
