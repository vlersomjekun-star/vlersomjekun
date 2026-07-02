import {
  Accessibility,
  Activity,
  Baby,
  Bone,
  Brain,
  Droplet,
  Droplets,
  Ear,
  Eye,
  HeartHandshake,
  HeartPulse,
  MessageCircle,
  Pill,
  Ribbon,
  ScanFace,
  Scissors,
  Smile,
  Stethoscope,
  TestTubes,
  Wind,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  smile: Smile,
  baby: Baby,
  "heart-handshake": HeartHandshake,
  "heart-pulse": HeartPulse,
  "scan-face": ScanFace,
  eye: Eye,
  brain: Brain,
  bone: Bone,
  activity: Activity,
  droplets: Droplets,
  droplet: Droplet,
  "test-tubes": TestTubes,
  pill: Pill,
  ear: Ear,
  scissors: Scissors,
  ribbon: Ribbon,
  accessibility: Accessibility,
  wind: Wind,
  stethoscope: Stethoscope,
  "message-circle": MessageCircle,
};

export default function SpecialtyIcon({
  icon,
  size = 24,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Stethoscope;
  return <Icon size={size} className={className} aria-hidden />;
}
