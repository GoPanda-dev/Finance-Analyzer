from django import forms
from .models import WatchlistItem

class WatchlistItemForm(forms.ModelForm):
    class Meta:
        model = WatchlistItem
        fields = ['symbol', 'name']

class RemoveWatchlistItemForm(forms.Form):
    item_id = forms.IntegerField(widget=forms.HiddenInput())
