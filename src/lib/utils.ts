import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function removeUnicode(input: string) {
  if (!input) {
    return "";
  }

  return input
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D");
}

export function stringToSlug(input: string, separator = "-") {
  const trimRegex = new RegExp(`^${separator}+|${separator}+$`, "g");

  let result = removeUnicode(input).toLowerCase();
  result = result.replaceAll(/['"“”‘’‚„]/g, "");
  result = result.replaceAll(/[^a-z0-9]+/g, separator);
  result = result.replaceAll(trimRegex, "");

  return result;
}
