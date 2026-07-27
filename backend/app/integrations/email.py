"""Mock email sender (Resend adapter slot). Logs instead of sending; the
pipeline records the recipient on the alert row so the UI can show 'email sent'."""
import logging

logger = logging.getLogger(__name__)


class MockEmailSender:
    async def send_alert_email(self, to: str, theme: str, share: float, threshold: float) -> bool:
        logger.info(
            "[mock email] to=%s subject='Alert: %s at %.0f%% (threshold %.0f%%)'",
            to, theme, share * 100, threshold * 100,
        )
        return True
