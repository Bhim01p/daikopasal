export default function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.5L3 20.7l1.4-4.8A8.5 8.5 0 1 1 20.5 11.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m8.1 7.2 1.3 2.6-.9 1.1c.8 1.5 2 2.7 3.6 3.5l1.1-.9 2.6 1.3c.3.2.3.6.1.9-.5.9-1.1 1.4-2.1 1.3-3.9-.5-7.4-4-7.9-7.9-.1-.9.4-1.6 1.3-2.1.3-.2.7-.1.9.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
