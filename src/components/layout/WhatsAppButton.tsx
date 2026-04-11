import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => (
  <a
    href="https://wa.me/919407466866?text=Hi%20Zorba%20Infotech%2C%20I%20have%20an%20inquiry."
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(142,70%,45%)] text-primary-foreground shadow-lg transition-transform hover:scale-110 animate-pulse-glow md:bottom-8 md:right-8"
    aria-label="Chat on WhatsApp"
  >
    <MessageCircle className="h-6 w-6" />
  </a>
);

export default WhatsAppButton;
