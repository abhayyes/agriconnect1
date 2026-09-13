import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, ROLES } from '../context/AuthContext.jsx'

const ROLE_COPY = {
  [ROLES.FARMER]: { label: 'Farmer / FPO', home: '/farmer' },
  [ROLES.BUYER]: { label: 'Buyer / Consumer', home: '/marketplace' },
}

const emptyForm = { name: '', phone: '', email: '', password: '', confirmPassword: '' }

/**
 * One component for all four /farmer|buyer/login|register routes — role
 * and mode come in as props from the route definition in App.jsx, so
 * there's a single form to maintain instead of four near-identical ones.
 *
 * Demo only: there's no backend account store yet, so "login" just accepts
 * whatever phone/password you type and signs you in as that role. Swap the
 * handleSubmit body for a real POST once auth endpoints are live.
 */
export default function AuthPage({ role, mode }) {
  const isRegister = mode === 'register'
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const roleCopy = ROLE_COPY[role]
  const otherMode = isRegister ? 'login' : 'register'
  const otherModePath = `/${role}/${otherMode}`

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.phone.trim() || !form.password) {
      setError('Phone number and password are required.')
      return
    }
    if (isRegister) {
      if (!form.name.trim() || !form.email.trim()) {
        setError('Name and email are required.')
        return
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    // TODO: replace with a real POST to the auth endpoint once it exists
    // (see docs/api-contracts.md). For now this just signs you in locally.
    const user = isRegister
      ? { name: form.name.trim(), phone: form.phone.trim(), role }
      : { phone: form.phone.trim(), role }

    login(user)
    navigate(roleCopy.home)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl">
          {isRegister ? 'Create account' : 'Log in'}
        </h1>
        <p className="mt-1 text-soil-light">{roleCopy.label}</p>
      </div>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        {isRegister && (
          <Field label="Name" name="name" value={form.name} onChange={handleChange} autoComplete="name" />
        )}

        <Field
          label="Phone number"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          autoComplete="tel"
        />

        {isRegister && (
          <Field
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
        )}

        <Field
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />

        {isRegister && (
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />
        )}

        {error && <p className="text-sm text-alert">{error}</p>}

        <button type="submit" className="btn-primary w-full">
          {isRegister ? 'Create account' : 'Log in'}
        </button>

        <p className="text-center text-sm text-soil-light">
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <Link to={otherModePath} className="font-medium text-leaf-dark hover:underline">
            {isRegister ? 'Log in' : 'Register'}
          </Link>
        </p>

        <p className="text-center text-sm">
          <Link to="/" className="text-soil-light hover:underline">
            &larr; Choose a different role
          </Link>
        </p>
      </form>
    </div>
  )
}

function Field({ label, name, type = 'text', value, onChange, autoComplete }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-soil">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-soil/15 bg-(--card)/70 px-3 py-2
          text-sm focus:outline-none focus:ring-2 focus:ring-leaf/40"
      />
    </label>
  )
}
