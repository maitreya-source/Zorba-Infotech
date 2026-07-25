import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/contact";

const WhatsAppButton = () => (
  <a
    href={whatsappLink("Hi Zorba Infotech, I have an inquiry.")}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(142,70%,45%)] text-primary-foreground shadow-lg transition-transform hover:scale-110 animate-pulse-glow md:bottom-8 md:right-8"
    aria-label="Chat on WhatsApp"
  >
    <MessageCircle className="h-6 w-6" />
  </a>
);

export default WhatsAppButton;
