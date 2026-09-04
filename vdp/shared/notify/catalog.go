package notify

// Channel is a delivery channel for a catalog entry.
type Channel string

const (
	ChannelTelegram Channel = "telegram"
	ChannelMail     Channel = "mail"
	ChannelSMS      Channel = "sms"
)

// Entry maps a business event to allowed channels and a template id.
type Entry struct {
	Event     string
	Template  string
	Channels  []Channel
	Roles     []string
	WorkChats []string
}

var catalog = []Entry{
	{Event: "form_payment.status_changed", Template: "status_changed", Channels: []Channel{ChannelTelegram}, Roles: []string{"user", "manager"}, WorkChats: []string{"ops"}},
	{Event: "form_accepted", Template: "form_accepted", Channels: []Channel{ChannelMail, ChannelTelegram}, Roles: []string{"user"}},
	{Event: "order_accepted", Template: "order_accepted", Channels: []Channel{ChannelMail, ChannelTelegram}, Roles: []string{"user"}},
	{Event: "payment_sent", Template: "payment_sent", Channels: []Channel{ChannelMail, ChannelTelegram}, Roles: []string{"user"}},
	{Event: "completed", Template: "completed", Channels: []Channel{ChannelMail, ChannelTelegram}, Roles: []string{"user"}},
	{Event: "refund_sent", Template: "refund_sent", Channels: []Channel{ChannelMail, ChannelTelegram}, Roles: []string{"user"}},
	{Event: "execution_deadline", Template: "execution_deadline", Channels: []Channel{ChannelMail, ChannelTelegram}, Roles: []string{"provider", "manager"}},
	{Event: "form_waiting_corrections", Template: "form_rejected", Channels: []Channel{ChannelTelegram, ChannelSMS}, Roles: []string{"user"}},
	{Event: "canceled_by_compliance", Template: "form_canceled", Channels: []Channel{ChannelTelegram, ChannelSMS}, Roles: []string{"user"}},
	{Event: "organization_blocked", Template: "org_blocked", Channels: []Channel{ChannelTelegram, ChannelSMS}, Roles: []string{"user"}},
	{Event: "otp", Template: "otp", Channels: []Channel{ChannelSMS}, Roles: []string{"user"}},
}

// Catalog returns a copy of the notification catalog.
func Catalog() []Entry {
	out := make([]Entry, len(catalog))
	copy(out, catalog)
	return out
}

// Lookup returns the catalog entry for event, if any.
func Lookup(event string) (Entry, bool) {
	for _, e := range catalog {
		if e.Event == event {
			return e, true
		}
	}
	return Entry{}, false
}

// AllowsChannel reports whether event may be sent on channel.
func AllowsChannel(event string, channel Channel) bool {
	entry, ok := Lookup(event)
	if !ok {
		return false
	}
	for _, c := range entry.Channels {
		if c == channel {
			return true
		}
	}
	return false
}

// SMSEvents is the narrow SMS allowlist (OTP + critical only).
func SMSEvents() []string {
	out := make([]string, 0)
	for _, e := range catalog {
		if AllowsChannel(e.Event, ChannelSMS) {
			out = append(out, e.Event)
		}
	}
	return out
}
