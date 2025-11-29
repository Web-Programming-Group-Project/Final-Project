import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../AppContext";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api";

export default function Header() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user?.username) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    async function loadNotifications() {
      setLoadingNotifications(true);
      setNotificationsError("");
      try {
        const data = await getNotifications({ username: user.username });
        if (!cancelled) {
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        if (!cancelled) {
          setNotificationsError(err.message || "Failed to load notifications");
        }
      } finally {
        if (!cancelled) setLoadingNotifications(false);
      }
    }
    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  useEffect(() => {
    if (!showNotifications) return;
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showNotifications]);

  function formatNotificationTime(value) {
    if (!value) return "";
    return new Date(value).toLocaleString();
  }

  async function handleViewNotification(notification) {
    if (!notification) return;
    if (!notification.read && user?.username) {
      try {
        await markNotificationRead({ username: user.username, notificationId: notification._id });
        setNotifications((prev) =>
          (prev || []).map((item) =>
            String(item._id) === String(notification._id) ? { ...item, read: true } : item
          )
        );
      } catch (err) {
        console.error("Failed to mark notification read", err);
      }
    }
    if (notification.meetingCode) {
      navigate("/Meetings", { state: { code: notification.meetingCode } });
      setShowNotifications(false);
    }
  }

  async function handleMarkAllRead() {
    if (!user?.username) return;
    try {
      await markAllNotificationsRead({ username: user.username });
      setNotifications((prev) => (prev || []).map((notif) => ({ ...notif, read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  }

  function handleSignOut() {
    setUser(null);
    setNotifications([]);
    navigate("/");
  }

  function goToUserPage() {
    navigate("/User");
  }

  const unreadCount = (notifications || []).filter((notif) => !notif.read).length;

  return (
    <div className="h-10 bg-sky-700 flex items-center justify-between px-4 text-white relative">
      {user ? <span className="font-semibold">Convo</span> : null}

      {user ? (
        <div className="flex items-center gap-4">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="bg-sky-700 hover:bg-sky-600 text-white px-3 py-1 rounded-md text-sm transition-colors relative"
            >
              Inbox
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#f87171",
                    color: "#fff",
                    borderRadius: "999px",
                    padding: "0 6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div
                className="nav-notifications-dropdown"
                style={{
                  position: "absolute",
                  top: "110%",
                  right: 0,
                  width: 320,
                  maxHeight: 340,
                  overflowY: "auto",
                  background: "#fff",
                  color: "#1f2933",
                  borderRadius: 8,
                  border: "1px solid #d0d7e5",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.2)",
                  padding: 12,
                  zIndex: 20,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Notifications</div>
                {notificationsError && (
                  <div style={{ color: "#b71c1c", fontSize: "0.9rem", marginBottom: 8 }}>
                    {notificationsError}
                  </div>
                )}
                {loadingNotifications && (
                  <div style={{ fontSize: "0.9rem", color: "#555" }}>Loading...</div>
                )}
                {!loadingNotifications && notifications.length === 0 && (
                  <div style={{ fontSize: "0.9rem", color: "#555" }}>No notifications.</div>
                )}
                {notifications.map((notification) => (
                  <div
                    key={notification._id || notification.createdAt}
                    style={{
                      borderBottom: "1px solid #e8eef7",
                      paddingBottom: 8,
                      marginBottom: 8,
                      opacity: notification.read ? 0.7 : 1,
                    }}
                  >
                    <div style={{ fontSize: "0.95rem", marginBottom: 4 }}>{notification.message}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 6 }}>
                      {formatNotificationTime(notification.createdAt)}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {notification.meetingCode && (
                        <button
                          type="button"
                          onClick={() => handleViewNotification(notification)}
                          className="bg-sky-700 hover:bg-sky-600 text-white px-2 py-1 rounded-md text-xs transition-colors"
                        >
                          View meeting
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-sky-700 text-xs underline"
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            className="bg-sky-700 hover:bg-sky-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            onClick={goToUserPage}
          >
            {user.firstName} {user.lastName}
          </button>
          <button
            onClick={handleSignOut}
            className="bg-sky-700 hover:bg-sky-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  );
}
