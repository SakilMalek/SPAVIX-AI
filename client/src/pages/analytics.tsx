import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Zap, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const fetchAnalytics = async () => {
  const { getApiUrl } = await import("@/config/api");
  const response = await fetch(getApiUrl("/api/analytics"), {
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Failed to fetch analytics");
  return response.json();
};

const COLORS = ["#9333ea", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    staleTime: 5 * 60 * 1000,
  });

  if (error) {
    toast.error("Failed to load analytics");
  }

  const stats = useMemo(() => {
    if (!analytics) return null;
    
    return {
      totalTransformations: analytics.totalTransformations || 0,
      totalProjects: analytics.totalProjects || 0,
      averageTransformationsPerDay: analytics.averageTransformationsPerDay || 0,
      mostUsedStyle: analytics.mostUsedStyle || "N/A",
      styleDistribution: analytics.styleDistribution || [],
      roomTypeDistribution: analytics.roomTypeDistribution || [],
      weeklyActivity: analytics.weeklyActivity || [],
    };
  }, [analytics]);

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your design transformation metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-panel border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Transformations</p>
                  <p className="text-3xl font-bold">{stats.totalTransformations}</p>
                </div>
                <Zap className="w-12 h-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Projects</p>
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Per Day</p>
                  <p className="text-3xl font-bold">{stats.averageTransformationsPerDay.toFixed(1)}</p>
                </div>
                <Clock className="w-12 h-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Favorite Style</p>
                  <p className="text-2xl font-bold capitalize">{stats.mostUsedStyle}</p>
                </div>
                <Users className="w-12 h-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Style Distribution */}
          <Card className="glass-panel border-none shadow-xl">
            <CardHeader>
              <CardTitle>Style Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.styleDistribution}
                    dataKey="count"
                    nameKey="style"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {stats.styleDistribution.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Room Type Distribution */}
          <Card className="glass-panel border-none shadow-xl">
            <CardHeader>
              <CardTitle>Room Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.roomTypeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="roomType" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#9333ea" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Activity */}
        <Card className="glass-panel border-none shadow-xl">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="transformations" stroke="#9333ea" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
