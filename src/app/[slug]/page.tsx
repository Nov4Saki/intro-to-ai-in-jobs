import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findActivity, listAllActivities } from "@/content";
import { ActivityPlayer } from "@/components/activity-player";

export function generateStaticParams() {
  return listAllActivities().map((activity) => ({
    slug: activity.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const activity = findActivity(slug);
  if (!activity) {
    return {
      title: "النشاط غير موجود",
    };
  }

  return {
    title: `${activity.title} - الذكاء الاصطناعي في العمل`,
    description: activity.subtitle,
  };
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const activity = findActivity(slug);
  if (!activity) {
    notFound();
  }

  return <ActivityPlayer activity={activity} />;
}
