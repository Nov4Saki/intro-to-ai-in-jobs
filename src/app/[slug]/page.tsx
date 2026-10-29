import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActivity, listActivities } from "@/content/session-1";
import { ActivityPlayer } from "@/components/activity-player";

export function generateStaticParams() {
  return listActivities().map((activity) => ({
    slug: activity.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const activity = getActivity(slug);
  if (!activity) {
    return {
      title: "النشاط غير موجود",
    };
  }

  return {
    title: `${activity.title} - مقدمة في الذكاء الاصطناعي`,
    description: activity.subtitle,
  };
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const activity = getActivity(slug);
  if (!activity) {
    notFound();
  }

  return <ActivityPlayer activity={activity} />;
}
