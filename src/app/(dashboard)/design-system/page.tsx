"use client";

import { useState } from "react";
import { BarChart3, Bell, Inbox, Plus } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { LoadingSkeleton, TableSkeleton } from "@/components/design-system/loading-skeleton";
import { StatusPill } from "@/components/design-system/status-pill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

const chartData = [
  { month: "Jan", value: 186 },
  { month: "Feb", value: 305 },
  { month: "Mar", value: 237 },
  { month: "Apr", value: 412 },
  { month: "May", value: 389 },
];

const chartConfig = {
  value: { label: "Value", color: "hsl(var(--primary))" },
};

export default function DesignSystemPage() {
  const [showSkeleton, setShowSkeleton] = useState(false);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Design System"
        description="COMPASS platform components — typography, spacing, and UI primitives"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            New Component
          </Button>
        }
      />

      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-8 mt-6">
          {/* Buttons */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="glass">Glass</Button>
            </div>
          </section>

          <Separator />

          {/* Inputs */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Inputs</h3>
            <div className="grid gap-4 max-w-md">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="you@company.com" />
              </div>
              <div className="space-y-2">
                <Label>Select</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Option 1</SelectItem>
                    <SelectItem value="2">Option 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* Badges & Status */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Badges & Status Pills</h3>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <StatusPill variant="success">Active</StatusPill>
              <StatusPill variant="warning">Pending</StatusPill>
              <StatusPill variant="error">Failed</StatusPill>
              <StatusPill variant="info">Processing</StatusPill>
            </div>
          </section>

          <Separator />

          {/* Avatar */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Avatars</h3>
            <div className="flex gap-3">
              <Avatar><AvatarFallback className="bg-primary/10 text-primary">RC</AvatarFallback></Avatar>
              <Avatar className="h-12 w-12"><AvatarFallback>AB</AvatarFallback></Avatar>
            </div>
          </section>

          <Separator />

          {/* Table */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Tables</h3>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["Button", "Input", "Card", "Table"].map((name) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell><StatusPill variant="success">Ready</StatusPill></TableCell>
                      <TableCell className="text-right text-muted-foreground">1.0</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          <Separator />

          {/* Charts */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Charts</h3>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sample Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Modals & Drawers */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Modals & Drawers</h3>
            <div className="flex gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Modal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Modal Title</DialogTitle>
                    <DialogDescription>COMPASS modal component with glass backdrop.</DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline">Open Drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Drawer Title</DrawerTitle>
                    <DrawerDescription>Side drawer for mobile-friendly panels.</DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6 mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">Heading 1</h1>
              <h2 className="text-3xl font-semibold tracking-tight">Heading 2</h2>
              <h3 className="text-2xl font-semibold">Heading 3</h3>
              <h4 className="text-xl font-medium">Heading 4</h4>
              <p className="text-base">Body text — The quick brown fox jumps over the lazy dog.</p>
              <p className="text-sm text-muted-foreground">Muted text — Secondary information and descriptions.</p>
              <p className="text-gradient text-2xl font-bold">Gradient Text</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Loading Skeletons</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowSkeleton(!showSkeleton)}>
                  Toggle
                </Button>
              </CardHeader>
              <CardContent>
                {showSkeleton ? <TableSkeleton rows={3} /> : <LoadingSkeleton rows={3} />}
              </CardContent>
            </Card>

            <EmptyState
              icon={Inbox}
              title="No data yet"
              description="Empty states guide users when there's nothing to display."
              action={{ label: "Get started" }}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Toast notifications are powered by Sonner</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
