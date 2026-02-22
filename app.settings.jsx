import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Button,
  Banner,
  Text,
  BlockStack,
  Select,
  Divider,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await prisma.appSettings.findUnique({
    where: { shop: session.shop },
  });
  return json({ settings: settings || {}, shop: session.shop });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const data = {
    abandonedThresholdMin: parseInt(formData.get("abandonedThresholdMin") || "60"),
    emailEnabled: formData.get("emailEnabled") === "true",
    emailFrom: formData.get("emailFrom") || null,
    emailSubject: formData.get("emailSubject") || "Ξεχάσατε κάτι στο καλάθι σας; 🛒",
    smtpHost: formData.get("smtpHost") || null,
    smtpPort: parseInt(formData.get("smtpPort") || "587"),
    smtpUser: formData.get("smtpUser") || null,
    smtpPass: formData.get("smtpPass") || null,
  };

  await prisma.appSettings.upsert({
    where: { shop: session.shop },
    create: { shop: session.shop, ...data },
    update: data,
  });

  return json({ success: true });
};

export default function SettingsPage() {
  const { settings, shop } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [threshold, setThreshold] = useState(
    String(settings.abandonedThresholdMin || 60)
  );
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled || false);
  const [emailFrom, setEmailFrom] = useState(settings.emailFrom || "");
  const [emailSubject, setEmailSubject] = useState(
    settings.emailSubject || "Ξεχάσατε κάτι στο καλάθι σας; 🛒"
  );
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState(String(settings.smtpPort || 587));
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || "");
  const [smtpPass, setSmtpPass] = useState(settings.smtpPass || "");

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("abandonedThresholdMin", threshold);
    formData.append("emailEnabled", String(emailEnabled));
    formData.append("emailFrom", emailFrom);
    formData.append("emailSubject", emailSubject);
    formData.append("smtpHost", smtpHost);
    formData.append("smtpPort", smtpPort);
    formData.append("smtpUser", smtpUser);
    formData.append("smtpPass", smtpPass);
    submit(formData, { method: "post" });
  }, [threshold, emailEnabled, emailFrom, emailSubject, smtpHost, smtpPort, smtpUser, smtpPass]);

  const thresholdOptions = [
    { label: "15 λεπτά", value: "15" },
    { label: "30 λεπτά", value: "30" },
    { label: "1 ώρα", value: "60" },
    { label: "2 ώρες", value: "120" },
    { label: "3 ώρες", value: "180" },
    { label: "24 ώρες", value: "1440" },
  ];

  return (
    <Page
      title="Ρυθμίσεις Cart Tracker"
      primaryAction={{
        content: isSaving ? "Αποθήκευση..." : "Αποθήκευση",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* General Settings */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Γενικές Ρυθμίσεις</Text>
                <FormLayout>
                  <Select
                    label="Χρόνος μέχρι εγκατάλειψη καλαθιού"
                    options={thresholdOptions}
                    value={threshold}
                    onChange={setThreshold}
                    helpText="Πόση ώρα να περιμένουμε πριν χαρακτηρίσουμε ένα καλάθι ως 'εγκαταλελειμμένο'"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <Divider />

            {/* Email Settings */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Ρυθμίσεις Email Ανάκτησης</Text>
                <Checkbox
                  label="Ενεργοποίηση αυτόματων emails ανάκτησης καλαθιού"
                  checked={emailEnabled}
                  onChange={setEmailEnabled}
                />
                {emailEnabled && (
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Email αποστολέα"
                        value={emailFrom}
                        onChange={setEmailFrom}
                        placeholder="noreply@myshop.gr"
                        type="email"
                        autoComplete="off"
                      />
                      <TextField
                        label="Θέμα email"
                        value={emailSubject}
                        onChange={setEmailSubject}
                        autoComplete="off"
                      />
                    </FormLayout.Group>
                    
                    <Text variant="headingSm" color="subdued">SMTP Server</Text>
                    <FormLayout.Group>
                      <TextField
                        label="SMTP Host"
                        value={smtpHost}
                        onChange={setSmtpHost}
                        placeholder="smtp.gmail.com"
                        autoComplete="off"
                      />
                      <TextField
                        label="SMTP Port"
                        value={smtpPort}
                        onChange={setSmtpPort}
                        type="number"
                        autoComplete="off"
                      />
                    </FormLayout.Group>
                    <FormLayout.Group>
                      <TextField
                        label="SMTP Username"
                        value={smtpUser}
                        onChange={setSmtpUser}
                        autoComplete="off"
                      />
                      <TextField
                        label="SMTP Password"
                        value={smtpPass}
                        onChange={setSmtpPass}
                        type="password"
                        autoComplete="off"
                      />
                    </FormLayout.Group>
                    <Banner tone="info">
                      Για Gmail: χρησιμοποιήστε App Password αντί για τον κωδικό σας.
                    </Banner>
                  </FormLayout>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
