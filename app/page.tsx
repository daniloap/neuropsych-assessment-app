import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { CogMetricsApp } from "@/components/workspace/app";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) return <main className="loading-screen"><div className="brand loading-brand"><span className="brand-symbol">c<span>m</span></span><b>CogMetrics</b></div><h1>Seu espaço de avaliação</h1><p>Entre na sua conta para abrir os registros demonstrativos.</p><a className="button primary" href={chatGPTSignInPath("/")} target="_top">Entrar com ChatGPT</a></main>;
  return <CogMetricsApp user={{ id: user.id, email: user.email, displayName: user.displayName }} />;
}
