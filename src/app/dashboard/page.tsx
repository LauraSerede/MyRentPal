import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";

function formatCurrency(amount: number) {
  return `KSh ${amount.toLocaleString()}`;
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {description && (
        <CardContent className="text-sm text-muted-foreground">
          {description}
        </CardContent>
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [propertiesRes, unitsRes, paymentsRes] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase.from("units").select("id, status"),
    supabase.from("payments").select("amount, status"),
  ]);

  const totalProperties = propertiesRes.count ?? 0;

  const units = unitsRes.data ?? [];
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "occupied").length;
  const occupancyRate =
    totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const payments = paymentsRes.data ?? [];
  const rentCollected = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const rentOutstanding = payments
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Properties" value={totalProperties} />
          <StatCard
            title="Units"
            value={totalUnits}
            description={`${occupiedUnits} occupied`}
          />
          <StatCard title="Occupancy" value={`${occupancyRate}%`} />
          <StatCard
            title="Rent collected"
            value={formatCurrency(rentCollected)}
          />
          <StatCard
            title="Rent outstanding"
            value={formatCurrency(rentOutstanding)}
          />
        </div>
      </div>
    </div>
  );
}
