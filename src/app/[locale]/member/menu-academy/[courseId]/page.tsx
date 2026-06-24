import { notFound } from "next/navigation";
import { getFranchiseMenuAcademyCourse } from "@/lib/franchise-menu-academy-courses";
import FranchiseMenuAcademyCourse from "@/views/FranchiseMenuAcademyCourse";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function LocaleMemberMenuAcademyCoursePage({
  params,
}: PageProps) {
  const { courseId } = await params;
  if (!getFranchiseMenuAcademyCourse(courseId)) {
    notFound();
  }

  return <FranchiseMenuAcademyCourse courseId={courseId} />;
}
