import ChangePasswordForm from '../components/ChangePasswordForm';

interface Props {
  onChanged: () => void;
  onLogout: () => void;
}

export default function ChangePassword({ onChanged, onLogout }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🌹</div>
            <h1 className="text-2xl font-bold text-primary">Смените пароль</h1>
            <p className="text-gray-500 text-sm mt-2">
              Сейчас стоит стандартный пароль, его небезопасно оставлять. Задайте свой, чтобы продолжить работу.
            </p>
          </div>

          <ChangePasswordForm onChanged={onChanged} />

          <button
            type="button"
            onClick={onLogout}
            className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
