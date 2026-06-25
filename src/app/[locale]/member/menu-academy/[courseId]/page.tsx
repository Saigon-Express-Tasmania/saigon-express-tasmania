import { notFound } from "next/navigation";
import FranchiseMenuAcademyCourse from "@/views/FranchiseMenuAcademyCourse";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function LocaleMemberMenuAcademyCoursePage({
  params,
}: PageProps) {
  const { courseId } = await params;
  const id = Number.parseInt(courseId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  return <FranchiseMenuAcademyCourse courseId={String(id)} />;
}
