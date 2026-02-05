export function slugify(text: string): string {
    return text
        .toString()
        .normalize('NFD')                   // Split accented characters
        .replace(/[\u0300-\u036f]/g, '')    // Remove accent marks
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')               // Replace spaces with -
        .replace(/[^\w-]/g, '')             // Remove non-word chars
        .replace(/--+/g, '-');              // Replace multiple - with single -
}
