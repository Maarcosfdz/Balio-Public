import { useTranslation } from "react-i18next";
import { Github, Linkedin } from "lucide-react";

function BallioLogo({ className }: { className?: string }) {
  return (
    <img
      src="logo.png"
      alt="Balio"
      className={`${className ?? ""} object-contain`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

/**
 * Common footer for all pages.
 */
export default function Footer() {
    const { t } = useTranslation();

    return (
      <div>
        <footer className="flex flex-col items-center justify-between gap-4 border-t px-8 py-6 text-sm text-muted-foreground sm:flex-row bg-muted/40">
              <div className="flex items-center gap-2">
                <BallioLogo className="h-6 w-auto" />
                <span className="font-semibold text-foreground">Balio</span>
                <span className="ml-2">© {new Date().getFullYear()}. {t("main.allRights")}</span>
              </div>

              <div className="flex gap-4">
                <a
                  href="https://www.linkedin.com/in/marcos-romay-82b16036a/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>

                <a
                  href="https://github.com/Maarcosfdz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="GitHub"
                >
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </footer>
        </div>
    );
}
