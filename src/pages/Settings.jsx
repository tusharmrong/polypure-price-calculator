import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import TextArea from '../components/TextArea.jsx'
import { defaultSettings } from '../data/defaultSettings.js'

export default function Settings() {
  return (
    <Card>
      <h2 className="mb-5 text-lg font-bold text-slate-950">Company Settings</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input defaultValue={defaultSettings.companyName} id="company-name" label="Company Name" />
        <Input defaultValue={defaultSettings.phone} id="company-phone" label="Phone" />
        <Input defaultValue={defaultSettings.email} id="company-email" label="Email" />
        <Input defaultValue={defaultSettings.website} id="company-website" label="Website" />
        <TextArea
          className="sm:col-span-2"
          defaultValue={defaultSettings.address}
          id="company-address"
          label="Address"
        />
        <div className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Logo Upload
          <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-brand-200 bg-brand-50 px-4 text-center text-sm text-slate-500">
            <img
              alt="Poly Pure"
              className="h-28 w-28 rounded-full bg-white object-contain shadow-sm"
              src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
            />
          </div>
        </div>
        <TextArea
          className="sm:col-span-2"
          defaultValue={defaultSettings.paymentMethod}
          id="company-payment"
          label="Payment Method"
        />
        <TextArea
          className="sm:col-span-2"
          defaultValue={defaultSettings.terms}
          id="company-terms"
          label="Terms and Conditions"
        />
        <div className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Signature / Stamp
          <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
            Signature or stamp placeholder
          </div>
        </div>
      </div>
      <div className="mt-5">
        <Button disabled variant="muted">
          Save Settings Later
        </Button>
      </div>
    </Card>
  )
}
