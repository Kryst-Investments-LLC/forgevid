import { CollaborationRoom } from "../../components/CollaborationRoom";

export default function CollaborationPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Collaboration Room</h1>
      <CollaborationRoom roomId="demo-room" user={{ id: "demo-user", name: "Demo User", email: "demo@demo.com" }} />
    </main>
  );
}
