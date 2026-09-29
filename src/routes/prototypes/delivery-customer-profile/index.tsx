import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Container,
  Heading,
  Loader,
  Stack,
  Text,
  Group,
} from "@recursica/adapter-mantine-v8";
import type { PrototypeMeta } from "..";
import { Prototype } from "../../Prototype";
import { usePrototypeModes } from "../../modes";
import type { Customer, CustomerStatus } from "../../../data/customers";
import {
  handlers,
  errorHandlers,
  notFoundHandlers,
} from "../../../api/customers";
import { worker } from "../../../api/worker";
import { modes } from "./modes";

export const meta: PrototypeMeta = {
  title: "Delivery Customer Profile",
  description:
    "Customer profile detail view showing contact info, account details, and order history summary. Demonstrates modes for success, not found, and API error.",
};

// Maps each mode's id to the handler set it swaps into /api/customers at runtime
const HANDLERS_BY_MODE: Record<number, typeof handlers> = {
  1: handlers,
  2: notFoundHandlers,
  3: errorHandlers,
};

type LoadState =
  | { status: "loading" }
  | { status: "ok"; customer: Customer }
  | { status: "error"; message: string }
  | { status: "not-found" };

function getStatusVariant(
  status: CustomerStatus,
): "primary-color" | "success" {
  // Only "success" carries a real sentiment (Active). What "warning" and
  // "alert" are for is an open question in recursica-skill-badge, so
  // Inactive/Suspended use the neutral style rather than guessing at one.
  switch (status) {
    case "Active":
      return "success";
    default:
      return "primary-color";
  }
}

// Loading start/completion are announced from a live region that already
// exists on the page (recursica-skill-loader); the message text below is
// what gets announced, not a separate element.
const LOADER_THRESHOLD_MS = 3000;

function CustomerProfileContent() {
  const { activeMode } = usePrototypeModes();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [showLoader, setShowLoader] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Load customer when mode changes
  useEffect(() => {
    // Reset to loading and swap handlers for the active mode
    setLoadState({ status: "loading" });
    setShowLoader(false);
    if (activeMode) {
      const handlerSet = HANDLERS_BY_MODE[activeMode.id] || handlers;
      worker.use(...handlerSet);
    }

    // The wait is real but usually short (~1s in the mock API). Nothing
    // shorter than ~3s should show a loader, so gate it on a timer instead
    // of rendering one unconditionally on every mount/mode change.
    const loaderTimer = setTimeout(
      () => setShowLoader(true),
      LOADER_THRESHOLD_MS,
    );

    // Simulate fetching customer profile
    const loadCustomer = async () => {
      try {
        const res = await fetch("/api/customers/cust_001");
        if (res.status === 404) {
          setLoadState({ status: "not-found" });
          return;
        }
        if (!res.ok) {
          setLoadState({
            status: "error",
            message: `API error: ${res.status} ${res.statusText}`,
          });
          return;
        }
        const customer = (await res.json()) as Customer;
        setLoadState({ status: "ok", customer });
      } catch (err) {
        setLoadState({
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    };

    loadCustomer();

    return () => {
      clearTimeout(loaderTimer);
      worker.resetHandlers();
    };
  }, [activeMode]);

  // Announces loading start and completion politely, without requiring a
  // visible loader on screen (recursica-skill-loader).
  const liveMessage =
    loadState.status === "loading"
      ? "Loading customer profile…"
      : loadState.status === "ok"
        ? "Customer profile loaded."
        : loadState.status === "not-found"
          ? "Customer profile not found."
          : "Customer profile failed to load.";

  return (
    <Container>
      <div
        role="status"
        aria-live="polite"
        ref={liveRegionRef}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
        }}
      >
        {liveMessage}
      </div>

      {loadState.status === "loading" && showLoader && (
        <Stack align="center" gap="md">
          <Loader />
          <Text>Loading customer profile…</Text>
        </Stack>
      )}

      {loadState.status === "not-found" && (
        <Stack gap="md">
          <Heading order={1}>Customer Not Found</Heading>
          <Text>The customer profile you requested does not exist.</Text>
        </Stack>
      )}

      {loadState.status === "error" && (
        <Stack gap="md">
          <Heading order={1}>Error Loading Profile</Heading>
          <Text>{loadState.message}</Text>
          <Text>
            Please try again or contact support if the problem persists.
          </Text>
        </Stack>
      )}

      {loadState.status === "ok" && (
        <Stack gap="lg">
          {/* Profile Header */}
          <Stack gap="sm">
            <Group>
              <div>
                <Heading order={1}>{loadState.customer.name}</Heading>
                <Text>
                  {loadState.customer.customer_id} · {loadState.customer.tier} tier
                </Text>
              </div>
              <Badge variant={getStatusVariant(loadState.customer.status)}>
                {loadState.customer.status}
              </Badge>
            </Group>
          </Stack>

          <hr />

          {/* Contact Information */}
          <Stack gap="md">
            <Heading order={2}>Contact Information</Heading>
            <Stack gap="sm">
              <div>
                <Text>Email</Text>
                <Text>{loadState.customer.email}</Text>
              </div>
              <div>
                <Text>Phone</Text>
                <Text>{loadState.customer.phone}</Text>
              </div>
              <div>
                <Text>Primary Address</Text>
                <Text>{loadState.customer.primary_address}</Text>
              </div>
            </Stack>
          </Stack>

          <hr />

          {/* Account Details */}
          <Stack gap="md">
            <Heading order={2}>Account Details</Heading>
            <Stack gap="sm">
              <Group grow>
                <div>
                  <Text>Member Since</Text>
                  <Text>
                    {new Date(
                      loadState.customer.account_created_at,
                    ).toLocaleDateString()}
                  </Text>
                </div>
                <div>
                  <Text>Total Orders</Text>
                  <Text>{loadState.customer.total_orders}</Text>
                </div>
                <div>
                  <Text>Lifetime Value</Text>
                  <Text>${loadState.customer.lifetime_value.toFixed(2)}</Text>
                </div>
                {loadState.customer.last_order_date && (
                  <div>
                    <Text>Last Order</Text>
                    <Text>
                      {new Date(
                        loadState.customer.last_order_date,
                      ).toLocaleDateString()}
                    </Text>
                  </div>
                )}
              </Group>
            </Stack>
          </Stack>
        </Stack>
      )}

      <Stack mt="xl">
        <hr />
        <Text>© {new Date().getFullYear()}</Text>
      </Stack>
    </Container>
  );
}

export default function DeliveryCustomerProfilePrototype() {
  return (
    <Prototype modes={modes}>
      <CustomerProfileContent />
    </Prototype>
  );
}
